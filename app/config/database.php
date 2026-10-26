
<?php

class Database
{
    private static ?PDO $connection = null;

    public static function connect(): PDO
    {
        if (self::$connection === null) {
            $dbPath = dirname(__DIR__, 2) . '/database/app.db';

            self::$connection = new PDO('sqlite:' . $dbPath);

            self::$connection->setAttribute(
                PDO::ATTR_ERRMODE,
                PDO::ERRMODE_EXCEPTION
            );

            self::$connection->setAttribute(
                PDO::ATTR_DEFAULT_FETCH_MODE,
                PDO::FETCH_ASSOC
            );

            self::$connection->setAttribute(
                PDO::ATTR_EMULATE_PREPARES,
                false
            );

            self::$connection->exec('PRAGMA foreign_keys = ON');
        }

        return self::$connection;
    }
}
