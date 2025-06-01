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
}

?>