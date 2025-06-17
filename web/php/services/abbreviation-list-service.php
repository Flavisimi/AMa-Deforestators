<?php

namespace ama\services;

use ama\repositories\AbbreviationRepository;

require_once(__DIR__ . "/../models/abbreviation-list.php");
require_once(__DIR__ . "/../repositories/meaning-repository.php");

use ama\models\AbbreviationList;
use ama\repositories\MeaningRepository;

class AbbreviationListService
{
    public static function attach_meanings($conn, AbbreviationList & $abbr_list)
    {
        $meanings = MeaningRepository::load_meanings_from_list($conn, $abbr_list->id);
        foreach($meanings as $meaning)
        {
            $abbreviation = AbbreviationRepository::load_abbreviation($conn, $meaning->abbr_id);
            MeaningService::attach_description($meaning, $abbreviation->searchable_name);
        }
        $abbr_list->meanings = $meanings;
    }
}

?>