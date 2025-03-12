const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const REPO_URL = 'https://github.com/cool-studio/words.git';
const REPO_DIR = path.join(__dirname, 'words');
const PHP_OUTPUT_DIR = path.join(__dirname, 'src');
const BASE_NAMESPACE = 'CoolStudio\\Words';

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

// Generate PHP class from word list
function generatePhpClass(language, category, words) {
    const className = category.charAt(0).toUpperCase() + category.slice(1);
    const namespace = `${BASE_NAMESPACE}\\${language.toUpperCase()}`;
    const outputDir = path.join(PHP_OUTPUT_DIR, language.toUpperCase());
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
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
    fs.writeFileSync(outputPath, phpContent);
    console.log(`Generated ${outputPath}`);
}

// Process all word lists in the repository
function processWordLists() {
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
            
            // Generate PHP class
            generatePhpClass(lang, category, words);
        });
    });
}

// Update version in composer.json if changes were made
function updateComposerVersion() {
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
    
    // Update composer version
    updateComposerVersion();
    
    console.log('Done!');
} catch (error) {
    console.error('Error:', error);
    process.exit(1);
} 