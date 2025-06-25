<?php

namespace ama\dtos;

class AbbrInsertDTO
{
    public string $name;
    public string $short_expansion;
    public string $description;
    public string $lang;
    public string $domain;

    public static function from_json(string $json): AbbrInsertDTO
    {
        $dto = json_decode($json, true);
        $output = new AbbrInsertDTO;
        $output->name = $dto["name"];
        $output->short_expansion = $dto["short_expansion"];
        $output->description = $dto["description"];
        $output->lang = $dto["lang"];
        $output->domain = $dto["domain"];

        return $output;
    }

    public static function from_csv_line(array $line): AbbrInsertDTO
    {
        $output = new AbbrInsertDTO;
        $output->name = $line[0];
        $output->short_expansion = $line[1];
        $output->description = $line[2];
        $output->lang = $line[3];
        $output->domain = $line[4];

        return $output;
    }
}

?>