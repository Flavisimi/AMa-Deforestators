<?php

namespace ama\dtos;

class MeaningUpdateDTO
{
    public string $name;
    public string $short_expansion;
    public string $description;
    public string $lang;
    public string $domain;
    public string $approval_status;

    public static function from_json(string $json): MeaningUpdateDTO
    {
        $dto = json_decode($json, true);
        $output = new MeaningUpdateDTO;
        $output->name = $dto["name"];
        $output->short_expansion = $dto["short_expansion"];
        $output->description = $dto["description"];
        $output->lang = $dto["lang"];
        $output->domain = $dto["domain"];
        $output->approval_status = $dto["approval_status"];

        return $output;
    }
}

?>