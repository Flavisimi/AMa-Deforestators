<?php

namespace ama\services;

require_once(__DIR__ . "/../models/meaning.php");
require_once(__DIR__ . "/../repositories/vote-repository.php");
require_once(__DIR__ . "/../helpers/docbook-helper.php");
require_once(__DIR__ . "/../exceptions/api-exception.php");

use ama\models\Meaning;
use ama\repositories\VoteRepository;
use ama\helpers\DocbookHelper;
use ama\exceptions\ApiException;


class MeaningService
{
    public static function attach_score($conn, Meaning & $meaning)
    {
        $score = VoteRepository::get_score($conn, $meaning->id);
        if($score === null)
            $score = 0;
        $meaning->score = $score;
    }

    public static function attach_description(Meaning & $meaning, $abbr_name)
    {
        $document = DocbookHelper::load_abbreviation_document($abbr_name);

        if($document === null)
            throw new ApiException(500, "Couldn't find file for abbreviation");
        
        foreach($document->variablelist->varlistentry as $entry)
        {
            if((string)$entry->term->abbrev == $meaning->name)
            {
                $meaning->description = (string)$entry->listitem->formalpara[1]->para;
                return;
            }
        }

        throw new ApiException(500, "Couldn't find meaning in file");
    }

}

?>