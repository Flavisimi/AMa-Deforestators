<?php

namespace ama\controllers;

require_once( __DIR__ . "/../models/abbreviation.php");
require_once( __DIR__ . "/../models/meaning.php");
require_once( __DIR__ . "/../helpers/connection-helper.php");
require_once( __DIR__ . "/../helpers/docbook-helper.php");
require_once( __DIR__ . "/../repositories/abbreviation-repository.php");
require_once( __DIR__ . "/../services/abbreviation-service.php");
require_once( __DIR__ . "/../dtos/abbreviation-insert-dto.php");
require_once( __DIR__ . "/../exceptions/api-exception.php");
require_once( __DIR__ . "/../dtos/abbr-multiple-insert-dto.php");

use ama\models\Abbreviation;
use ama\models\Meaning;
use ama\helpers\ConnectionHelper;
use ama\helpers\DocbookHelper;
use ama\repositories\AbbreviationRepository;
use ama\services\AbbreviationService;
use ama\dtos\AbbrInsertDTO;
use ama\exceptions\ApiException;
use ama\dtos\AbbrMultipleInsertDTO;

class AbbreviationController
{
    public static function get_abbreviation_by_id(int $id): ?Abbreviation
    {
        $conn = ConnectionHelper::open_connection();
        try
        {
            $abbreviation = AbbreviationRepository::load_abbreviation($conn, $id);
            AbbreviationService::attach_meanings($conn, $abbreviation);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }

        AbbreviationRepository::visit_abbreviation($conn, $id);

        oci_close($conn);
        return $abbreviation;
    }

    public static function get_all_abbreviations(): ?array
    {
        $conn = ConnectionHelper::open_connection();
        try
        {
            $abbreviations = AbbreviationRepository::load_all_abbreviations($conn);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }
        oci_close($conn);
        return $abbreviations;
    }

    public static function get_abbreviations_paginated(int $page = 1, int $limit = 20): array
    {
        $conn = ConnectionHelper::open_connection();
        try
        {
            $offset = ($page - 1) * $limit;
            $abbreviations = AbbreviationRepository::load_abbreviations_paginated($conn, $limit, $offset);
            $total = AbbreviationRepository::get_total_abbreviations_count($conn);
            
            $totalPages = ceil($total / $limit);
            $hasMore = $page < $totalPages;
            
            $result = [
                'abbreviations' => $abbreviations ?: [],
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $limit,
                    'total' => $total,
                    'total_pages' => $totalPages,
                    'has_more' => $hasMore
                ]
            ];
            
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }
        oci_close($conn);
        return $result;
    }

    public static function create_abbreviation($dto, $conn = null) : Abbreviation
    {
        if(!isset($_SESSION["user_id"]))
            throw new ApiException(401, "You need to be logged in to create an abbreviation");

        $opened_here = false;
        if($conn == null)
        {
            $conn = ConnectionHelper::open_connection();
            $opened_here = true;
        }

        try
        {
            AbbreviationRepository::insert_abbreviation($conn, $dto, false);
            $abbreviation = AbbreviationRepository::load_abbreviation_by_name($conn, $dto->name);
            
            $meaning = new Meaning;
            $meaning->name = $dto->name;
            $meaning->short_expansion = $dto->short_expansion;
            $meaning->lang = $dto->lang;
            $meaning->domain = $dto->domain;

            $description = $dto->description;

            $document = DocbookHelper::load_abbreviation_document($abbreviation->searchable_name);
            if($document == null)
                $document = DocbookHelper::create_abbreviation_document($abbreviation->searchable_name);
            
            DocbookHelper::add_meaning_to_abbr_document($document, $meaning, $description);

            if(!DocbookHelper::save_document($document))
            {
                oci_rollback($conn);
                throw new ApiException(500, "Could not save abbreviation to file");
            }

            oci_commit($conn);
            AbbreviationService::attach_meanings($conn, $abbreviation);
        } catch(ApiException $e)
        {
            if($opened_here)
                oci_close($conn);
            throw $e;
        }
        
        if($opened_here)
            oci_close($conn);
        return $abbreviation;
    }

    public static function create_abbreviations_from_csv($csv_stream) : AbbrMultipleInsertDTO
    {
        if(!isset($_SESSION["user_id"]))
            throw new ApiException(401, "You need to be logged in to create an abbreviation");

        $output = new AbbrMultipleInsertDTO;
        $output->count = 0;
        $output->errors = array();

        $conn = ConnectionHelper::open_connection();
        while(1)
        {
            try
            {
                $line = fgetcsv($csv_stream);
                if($line === false)
                    break;
                $dto = AbbrInsertDTO::from_csv_line($line);
            } catch(\Exception $e)
            {
                $output->errors[] = $e->getMessage();
                continue;
            } catch(\Error $e)
            {
                $output->errors[] = $e->getMessage();
                continue;
            }

            try
            {
                self::create_abbreviation($dto, $conn);
                $output->count++;
            }
            catch(ApiException $e)
            {
                //do nothing if cause is unauthorized
                if($e->status_code != 401)
                {
                    $output->errors[] = $e;
                }
            }
        }

        oci_close($conn);
        return $output;
    }

    public static function handle_get()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $query_components = array();
        parse_str($_SERVER['QUERY_STRING'], $query_components);

        if($url === "/api/abbreviations")
        {
            if(isset($query_components["id"]))
            {
                if(!is_numeric($query_components["id"]))
                    throw new ApiException(400, "Invalid ID");
                
                $rez = AbbreviationController::get_abbreviation_by_id($query_components["id"]);
                header("Content-Type: application/json");
                echo json_encode($rez);
            }
            else if(isset($_GET["page"]) || isset($_GET["limit"]))
            {
                $page = isset($_GET["page"]) ? max(1, (int)$_GET["page"]) : 1;
                $limit = isset($_GET["limit"]) ? min(50, max(1, (int)$_GET["limit"])) : 20;
                
                $result = self::get_abbreviations_paginated($page, $limit);
                
                header("Content-Type: application/json");
                echo json_encode($result);
            }
            else
            {
                $rez = AbbreviationController::get_all_abbreviations();
                header("Content-Type: application/json");
                echo json_encode($rez);
            }
        }
        else
        {
            http_response_code(400);
        }
    }
    
    public static function handle_post()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $query_components = array();
        parse_str($_SERVER['QUERY_STRING'], $query_components);

        if($url === "/api/abbreviations")
        {
            $request_body = file_get_contents("php://input");
            $dto = AbbrInsertDTO::from_json($request_body);
            $rez = AbbreviationController::create_abbreviation($dto);

            header("Content-Type: application/json");
            echo json_encode($rez);
        }
        else if($url === "/api/abbreviations/csv")
        {
            $headers = apache_request_headers();
            $content_type = $headers["Content-Type"];
            if($content_type != "text/csv")
                throw new ApiException(400, "Invalid content type!");
            $request_body = fopen("php://input", "r");
            
            $rez = self::create_abbreviations_from_csv($request_body);

            header("Content-Type: application/json");
            echo json_encode($rez);
        }
        else
        {
            http_response_code(400);
        }
    }
    public static function handle_request()
    {
        session_start();
        if($_SERVER['REQUEST_METHOD'] === 'GET')
            AbbreviationController::handle_get();
        else if($_SERVER['REQUEST_METHOD'] === 'POST')
            AbbreviationController::handle_post();
        else
        {
            http_response_code(400);
        }
    }
}

try
{
    AbbreviationController::handle_request();
} 
catch(ApiException $e)
{
    http_response_code($e->status_code);
    header("Content-Type: application/json");
    echo json_encode($e);
}
catch(\Exception $e)
{
    http_response_code(500);
    header("Content-Type: application/json");
    echo json_encode($e);
}

?>