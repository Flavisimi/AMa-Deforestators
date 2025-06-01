<?php

namespace ama\models;

class Vote
{
    public int $voter_id;
    public int $meaning_id;
    public int $vote;
    public \DateTime $vote_date;
}
?>