<?php
namespace ama\helpers;

use ama\exceptions\ApiException;
use ama\models\Meaning;

require_once( __DIR__ . "/../exceptions/api-exception.php");
require_once( __DIR__ . "/../models/meaning.php");

ini_set('display_errors', 0);
error_reporting(0);

class DocbookHelper
{
    public static function create_abbreviation_document_with_meaning($abbr_name, Meaning $meaning, $description): \SimpleXMLElement
    {
        $document = new \SimpleXMLElement("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<article version=\"5.2\" xmlns=\"http://docbook.org/ns/docbook\"></article>");

        $title = $document->addChild("title");
        $title->addChild("abbrev", $abbr_name);

        $meanings = $document->addChild("variablelist");
        $meanings->addChild("title", "Meanings");

        self::add_meaning_to_abbr_document($document, $meaning, $description);
        
        return $document;
    }

    public static function load_abbreviation_document($abbr_name): ?\SimpleXMLElement
    {
        if(file_exists("/abbreviations/" . $abbr_name . ".xml"))
        {
            $document = simplexml_load_file("/abbreviations/" . $abbr_name . ".xml");
            return $document;
        }
        return null;
    }

    public static function add_meaning_to_abbr_document($document, $meaning, $description)
    {
        $meanings = $document->variablelist;

        $entry = $meanings->addChild("varlistentry");

        $entry->addChild("term");
        $entry->term->addChild("abbrev", $meaning->name);

        $item = $entry->addChild("listitem");

        $exp_para = $item->addChild("formalpara");
        $exp_para->addChild("title", "Expansion");
        $exp_para->addChild("para", $meaning->short_expansion);

        $desc_para = $item->addChild("formalpara");
        $desc_para->addChild("title", "Description");
        $desc_para->addChild("para", $description);

        $lang_para = $item->addChild("formalpara");
        $lang_para->addChild("title", "Language");
        $lang_para->addChild("para", $meaning->lang);

        $domain_para = $item->addChild("formalpara");
        $domain_para->addChild("title", "Domain");
        $domain_para->addChild("para", $meaning->domain);
    }

    public static function save_document($document)
    {
        $abbr_name = (string)$document->title->abbrev;
        return file_put_contents("/abbreviations/" . $abbr_name . ".xml", $document->asXML());
    }
}

?>