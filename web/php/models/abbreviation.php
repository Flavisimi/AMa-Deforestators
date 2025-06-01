<?php
namespace ama\models;
class Abbreviation
{
    public int $id;
    public string $searchable_name;
    public int $meaning_count;
    public \DateTime $created_at;
    public \DateTime $updated_at;
    public ?array $meanings;
}


?>