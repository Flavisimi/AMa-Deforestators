<?php

namespace ama\services;

require_once(__DIR__ . "/../models/abbreviation-list.php");
require_once(__DIR__ . "/../repositories/meaning-repository.php");
require_once(__DIR__ . "/../services/meaning-service.php");
require_once(__DIR__ . "/../helpers/filter-helper.php");

use ama\models\AbbreviationList;
use ama\repositories\MeaningRepository;
use ama\services\MeaningService;
use ama\helpers\FilterHelper;

class AbbreviationListService
{
    public static function attach_meanings($conn, AbbreviationList & $abbr_list)
    {
        $meanings = MeaningRepository::load_meanings_from_list($conn, $abbr_list->id);
        foreach($meanings as $meaning)
        {
            MeaningService::attach_description($meaning, FilterHelper::get_searchable_name($meaning->name));
            MeaningService::attach_score($conn, $meaning);
        }
        $abbr_list->meanings = $meanings;
    }
}

?>