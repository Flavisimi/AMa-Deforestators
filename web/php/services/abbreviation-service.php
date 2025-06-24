<?php

namespace ama\services;

require_once(__DIR__ . "/../models/abbreviation.php");
require_once(__DIR__ . "/../models/meaning.php");
require_once(__DIR__ . "/../repositories/meaning-repository.php");
require_once(__DIR__ . "/../repositories/vote-repository.php");
require_once(__DIR__ . "/../services/meaning-service.php");

use ama\models\Abbreviation;
use ama\models\Meaning;
use ama\repositories\MeaningRepository;
use ama\repositories\VoteRepository;
use ama\services\MeaningService;

class AbbreviationService
{
    public static function attach_meanings($conn, Abbreviation & $abbreviation)
    {
        $meanings = MeaningRepository::load_meanings_by_abbr_id($conn, $abbreviation->id);
        foreach($meanings as $meaning)
        {
            MeaningService::attach_description($meaning, $abbreviation->searchable_name);
            MeaningService::attach_score($conn, $meaning);
            
            if(isset($_SESSION["user_id"])) {
                $user_vote = VoteRepository::load_vote($conn, $_SESSION["user_id"], $meaning->id);
                $meaning->user_vote = $user_vote ? $user_vote->vote : null;
            } else {
                $meaning->user_vote = null;
            }
        }
        $abbreviation->meanings = $meanings;
    }
}

?>