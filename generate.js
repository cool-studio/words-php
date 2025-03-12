const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// Configuration
const REPO_URL = 'https://github.com/cool-studio/words.git';
const REPO_DIR = path.join(__dirname, 'words');
const PHP_OUTPUT_DIR = path.join(__dirname, 'src');
const BASE_NAMESPACE = 'CoolStudio\\Words';
const HASH_FILE = path.join(__dirname, '.words-hash');

// Track if real word content changes were made
let wordContentChanged = false;

// Create output directory if it doesn't exist
if (!fs.existsSync(PHP_OUTPUT_DIR)) {
    fs.mkdirSync(PHP_OUTPUT_DIR, { recursive: true });
}

// Clone repository if it doesn't exist
function cloneRepository() {
    console.log(`Cloning ${REPO_URL}...`);
    
    if (!fs.existsSync(REPO_DIR)) {
        execSync(`git clone ${REPO_URL} ${REPO_DIR}`, { stdio: 'inherit' });
    } else {
        console.log('Repository directory already exists. Pulling latest changes...');
        execSync(`cd ${REPO_DIR} && git pull`, { stdio: 'inherit' });
    }
}

// Generate a hash for the content to check if it changed
function generateContentHash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
}

// Load the previous state from hash file
function loadPreviousState() {
    if (fs.existsSync(HASH_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(HASH_FILE, 'utf8'));
        } catch (e) {
            console.error('Error reading previous state file:', e);
            return { files: [] };
        }
    }
    return { files: [] };
}

// Find previous file hash by language and category
function findPreviousFileHash(previousFiles, language, category) {
    const prevFile = previousFiles.find(
        file => file.language === language && file.category === category
    );
    return prevFile ? prevFile.hash : null;
}

// Generate PHP class from word list
function generatePhpClass(language, category, words, contentHash, previousHash) {
    const className = category.charAt(0).toUpperCase() + category.slice(1);
    const namespace = `${BASE_NAMESPACE}\\${language.toUpperCase()}`;
    const outputDir = path.join(PHP_OUTPUT_DIR, language.toUpperCase());
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Check if content has changed by comparing hashes
    if (previousHash !== contentHash) {
        wordContentChanged = true;
        console.log(`Content changed for ${language}/${category}`);
    }
    
    const phpContent = `<?php

namespace ${namespace};

use CoolStudio\\Words\\WordsList;

/**
 * ${className} word list in ${language} language
 */
class ${className} extends WordsList
{
    /**
     * Array of words in this list
     * 
     * @var array
     */
    protected static $wordsList = [
        ${words.map(word => `'${word}'`).join(',\n        ')}
    ];
}
`;

    const outputPath = path.join(outputDir, `${className}.php`);
    
    // Write file if it doesn't exist or content has changed
    if (!fs.existsSync(outputPath)) {
        fs.writeFileSync(outputPath, phpContent);
        console.log(`Generated ${outputPath}`);
    } else {
        const existingContent = fs.readFileSync(outputPath, 'utf8');
        if (existingContent !== phpContent) {
            fs.writeFileSync(outputPath, phpContent);
            console.log(`Updated ${outputPath}`);
        } else {
            console.log(`No changes to ${outputPath}`);
        }
    }
}

// Save hash of all processed files to track changes
function saveCurrentState(processedFiles) {
    const hashData = {
        files: processedFiles,
        timestamp: new Date().toISOString()
    };
    fs.writeFileSync(HASH_FILE, JSON.stringify(hashData, null, 2));
}

// Process all word lists in the repository
function processWordLists() {
    // Load previous state
    const previousState = loadPreviousState();
    const previousFiles = previousState.files || [];
    
    // Track processed files
    const processedFiles = [];
    
    // Get all language directories
    const languageDirs = fs.readdirSync(REPO_DIR)
        .filter(file => {
            const stats = fs.statSync(path.join(REPO_DIR, file));
            return stats.isDirectory() && !file.startsWith('.') && file !== 'node_modules';
        });
    
    // Process each language directory
    languageDirs.forEach(lang => {
        const langDir = path.join(REPO_DIR, lang);
        
        // Skip if not a directory of word lists
        if (!fs.existsSync(langDir) || !fs.statSync(langDir).isDirectory()) {
            return;
        }
        
        // Get all word list files
        const wordFiles = fs.readdirSync(langDir)
            .filter(file => file.endsWith('.txt'));
        
        // Process each word list file
        wordFiles.forEach(file => {
            const category = path.basename(file, '.txt');
            const filePath = path.join(langDir, file);
            
            // Read words from file
            const content = fs.readFileSync(filePath, 'utf8');
            const words = content.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
            
            // Generate content hash
            const contentHash = generateContentHash(content);
            
            // Find previous hash for this file
            const previousHash = findPreviousFileHash(previousFiles, lang, category);
            
            // Track processed files
            processedFiles.push({
                language: lang,
                category: category,
                hash: contentHash
            });
            
            // Generate PHP class
            generatePhpClass(lang, category, words, contentHash, previousHash);
        });
    });
    
    // Check for any deleted word lists
    for (const prevFile of previousFiles) {
        const stillExists = processedFiles.some(
            file => file.language === prevFile.language && 
                   file.category === prevFile.category
        );
        
        if (!stillExists) {
            // This file no longer exists, so we should delete its PHP class
            const className = prevFile.category.charAt(0).toUpperCase() + prevFile.category.slice(1);
            const phpFilePath = path.join(PHP_OUTPUT_DIR, prevFile.language.toUpperCase(), `${className}.php`);
            
            if (fs.existsSync(phpFilePath)) {
                fs.unlinkSync(phpFilePath);
                console.log(`Deleted ${phpFilePath} as its source no longer exists`);
                wordContentChanged = true;
            }
        }
    }
    
    // Save current state for future comparison
    saveCurrentState(processedFiles);
    
    return processedFiles;
}

// Update version in composer.json if word content changes were detected
function updateComposerVersion() {
    if (!wordContentChanged) {
        console.log('No word content changes detected. Composer version remains unchanged.');
        return;
    }
    
    const composerPath = path.join(__dirname, 'composer.json');
    if (fs.existsSync(composerPath)) {
        const composer = JSON.parse(fs.readFileSync(composerPath, 'utf8'));
        
        // Increment patch version
        const versionParts = composer.version.split('.');
        versionParts[2] = parseInt(versionParts[2]) + 1;
        composer.version = versionParts.join('.');
        
        // Write updated composer.json
        fs.writeFileSync(composerPath, JSON.stringify(composer, null, 4));
        console.log(`Updated composer.json version to ${composer.version}`);
    }
}

// Main execution
try {
    // Clone/update repository
    cloneRepository();
    
    // Process word lists
    processWordLists();
    
    // Update composer version only if word content changes were detected
    updateComposerVersion();
    
    console.log('Done!');
} catch (error) {
    console.error('Error:', error);
    process.exit(1);
} 