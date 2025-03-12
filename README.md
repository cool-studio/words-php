# Words PHP

A PHP library containing word lists for various categories and languages. This library is generated from the [cool-studio/words](https://github.com/cool-studio/words) repository.

## Installation

You can install the package via composer:

```bash
composer require words-studio/words-php
```

## Usage

### Getting all words in a list

```php
use Words\EN\Animals;

// Get all words
$allAnimals = Animals::words();
```

### Getting a random word

```php
use Words\EN\Animals;

// Get a random word
$randomAnimal = Animals::word();
```

## Available Word Lists

The library includes the following word lists:

### English (EN)
- Animals
- SciFi
- Space
- Tech
- Words (General words)

## Generating/Updating Word Lists

Word lists are generated from the [cool-studio/words](https://github.com/cool-studio/words) repository. To update the word lists or generate new ones:

1. Make sure you have Node.js installed
2. Run the generation script:

```bash
node generate.js
```

This will:
1. Clone or update the words repository
2. Generate PHP classes for each word list
3. Update the version in composer.json

## License

This project is licensed under the MIT License - see the LICENSE file for details. 