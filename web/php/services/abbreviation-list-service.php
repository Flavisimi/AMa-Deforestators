<?php

namespace ama\services;

require_once(__DIR__ . "/../models/abbreviation-list.php");
require_once(__DIR__ . "/../repositories/meaning-repository.php");

use ama\models\AbbreviationList;
use ama\repositories\MeaningRepository;

class AbbreviationListService
{
    public static function attach_meanings($conn, AbbreviationList & $abbr_list)
    {
        $meanings = MeaningRepository::load_meanings_from_list($conn, $abbr_list->id);
        $abbr_list->meanings = $meanings;
    }
}

?>