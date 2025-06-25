<?php

namespace ama\models;
class Meaning
{
    public int $id;
    public int $abbr_id;
    public string $name;
    public string $short_expansion;
    public string $description;
    public int $uploader_id;
    public string $approval_status;
    public string $lang;
    public string $domain;
    public \DateTime $created_at;
    public \DateTime $updated_at;

    public ?int $score;
    public ?float $controversy;
    public ?float $like_rate;
    public ?int $user_vote;
    public ?string $uploader_name;
}

?>