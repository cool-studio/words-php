<?php

namespace CoolStudio\Words;

/**
 * Abstract class for all word list classes
 */
abstract class WordsList
{
    /**
     * Array of words in this list
     * Must be defined by each concrete class
     * 
     * @var array
     */
    protected static $wordsList = [];

    /**
     * Returns all words in the list
     *
     * @return array Array of strings containing all words
     */
    public static function words(): array
    {
        return static::$wordsList;
    }

    /**
     * Returns a random word from the list
     *
     * @return string A random word from the list
     */
    public static function word(): string
    {
        return static::$wordsList[array_rand(static::$wordsList)];
    }
} 