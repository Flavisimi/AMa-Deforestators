<?php

namespace ama\services;

require_once(__DIR__ . "/../models/abbreviation.php");
require_once(__DIR__ . "/../models/meaning.php");
require_once(__DIR__ . "/../repositories/meaning-repository.php");
require_once(__DIR__ . "/../services/meaning-service.php");

use ama\models\Abbreviation;
use ama\models\Meaning;
use ama\repositories\MeaningRepository;
use ama\services\MeaningService;

class AbbreviationService
{
    public static function attach_meanings($conn, Abbreviation & $abbreviation)
    {
        $meanings = MeaningRepository::load_meanings_by_abbr_id($conn, $abbreviation->id);
        foreach($meanings as $meaning)
            MeaningService::attach_description($meaning, $abbreviation->searchable_name);
        $abbreviation->meanings = $meanings;
    }
}

?>