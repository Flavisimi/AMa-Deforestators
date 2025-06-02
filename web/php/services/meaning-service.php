<?php

namespace ama\services;

require_once(__DIR__ . "/../models/meaning.php");
require_once(__DIR__ . "/../repositories/vote-repository.php");

use ama\models\Meaning;
use ama\repositories\VoteRepository;

class MeaningService
{
    public static function attach_score($conn, Meaning & $meaning)
    {
        $score = VoteRepository::get_score($conn, $meaning->id);
        if($score === null)
            $score = 0;
        $meaning->score = $score;
    }
}

?>