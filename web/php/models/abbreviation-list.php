<?php
namespace ama\models;
class AbbreviationList
{
    public int $id;
    public int $creator_id;
    public string $name;
    public bool $private;

    public \DateTime $created_at;
    public \DateTime $updated_at;

    public ?array $meanings;
}
?>