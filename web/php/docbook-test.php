<?php
use ama\helpers\DocbookHelper;
use ama\models\Meaning;

require_once( __DIR__ . "/helpers/docbook-helper.php");
require_once( __DIR__ . "/models/meaning.php");

header("Content-Type: text/plain");

$meaning = new Meaning;
$meaning->name = "AmA";
$meaning->short_expansion = "ask me anything";
$meaning->lang = "eng";
$meaning->domain = "internet";

$elem = DocbookHelper::create_abbreviation_document_with_meaning("AMA", $meaning, "ceva");
echo $elem->asXML();

?>