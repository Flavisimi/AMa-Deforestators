<?php

use ama\helpers\DocbookHelper;
use ama\models\Meaning;

require_once("/var/www/html/php/helpers/docbook-helper.php");
require_once("/var/www/html/php/models/meaning.php");

$meaning = new Meaning;

$handle = fopen(__DIR__ . "/default_meanings.csv", "r");

while(($line = fgetcsv($handle)) !== false)
{
    $abbr_name = $line[0];
    $meaning->name = $line[1];
    $meaning->short_expansion = $line[2];
    $description = $line[3];
    $meaning->lang = $line[4];
    $meaning->domain = $line[5];

    $doc = DocbookHelper::load_abbreviation_document($abbr_name);
    if($doc === null)
        $doc = DocbookHelper::create_abbreviation_document($abbr_name);

    DocbookHelper::add_meaning_to_abbr_document($doc, $meaning, $description);
    
    DocbookHelper::save_document($doc);
}

?>