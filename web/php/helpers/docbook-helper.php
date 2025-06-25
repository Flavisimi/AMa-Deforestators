<?php
namespace ama\helpers;

ini_set('display_errors', 0);
error_reporting(0);

class DocbookHelper
{
    public static function create_abbreviation_document($abbr_name): \SimpleXMLElement
    {
        $document = new \SimpleXMLElement("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<article version=\"5.2\" xmlns=\"http://docbook.org/ns/docbook\"></article>");

        $title = $document->addChild("title");
        $title->addChild("abbrev", $abbr_name);

        $meanings = $document->addChild("variablelist");
        $meanings->addChild("title", "Meanings");

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

    public static function add_meaning_to_abbr_document($document, $meaning, $description): bool
    {
        $meanings = $document->variablelist;
        foreach($meanings->children() as $child)
        {
            if($child->getName() != "varlistentry")
                continue;

            if($child->listitem->formalpara[0]->para == $meaning->short_expansion)
                return false;
        }

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

        return true;
    }

    public static function delete_meaning_from_document($document, $short_expansion): bool
    {
        $meanings = $document->variablelist;
        foreach($meanings->children() as $child)
        {
            if($child->getName() != "varlistentry")
                continue;

            if($child->listitem->formalpara[0]->para != $short_expansion)
                continue;

            unset($child[0]);
            return true;
        }

        return false;
    }

    public static function save_document($document)
    {
        $abbr_name = (string)$document->title->abbrev;
        return file_put_contents("/abbreviations/" . $abbr_name . ".xml", $document->asXML());
    }
}

?>