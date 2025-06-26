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
            if((string)$entry->listitem->formalpara[0]->para == $meaning->short_expansion)
            {
                $meaning->description = (string)$entry->listitem->formalpara[1]->para;
                return;
            }
        }

        throw new ApiException(500, "Couldn't find meaning in file");
    }

    public static function attach_user_vote($conn, Meaning & $meaning)
    {
        if(isset($_SESSION["user_id"])) {
            $user_vote = VoteRepository::load_vote($conn, $_SESSION["user_id"], $meaning->id);
            $meaning->user_vote = $user_vote ? $user_vote->vote : null;
        } else {
            $meaning->user_vote = null;
        }
    }
}

?>