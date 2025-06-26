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

        $opened_here = $conn === null;
        if($opened_here)
        {
            $conn = ConnectionHelper::open_connection();
        }

        try
        {
            AbbreviationRepository::insert_abbreviation($conn, $dto, $opened_here);
            $abbreviation = AbbreviationRepository::load_abbreviation_by_name($conn, $dto->name);
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

    public static function create_abbreviations_csv(AbbrMultipleInsertDTO $dto) : int
    {
        if(!isset($_SESSION["user_id"]))
            throw new ApiException(401, "You need to be logged in to create abbreviations");

        $conn = ConnectionHelper::open_connection();

        $count = 0;

        foreach($dto->abbreviations as $abbr_dto)
        {
            $existing = AbbreviationRepository::load_abbreviation_by_name($conn, $abbr_dto->name);
            if($existing !== null)
                continue;

            try
            {
                AbbreviationRepository::insert_abbreviation($conn, $abbr_dto, false);
                $count++;
            } catch(ApiException $e)
            {
                continue;
            }
        }

        if(!oci_commit($conn))
            throw new ApiException(500, oci_error($conn)['message'] ?? "unknown");

        oci_close($conn);

        return $count;
    }

    public static function handle_get()
    {
        if(isset($_GET["id"]))
        {
            $id = (int) $_GET["id"];
            $abbreviation = self::get_abbreviation_by_id($id);
            
            if($abbreviation === null)
            {
                http_response_code(404);
                echo json_encode(["error" => "No abbreviation found with that ID"]);
                return;
            }

            header("Content-Type: application/json");
            echo json_encode($abbreviation);
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
            $abbreviations = self::get_all_abbreviations();
            header("Content-Type: application/json");
            echo json_encode($abbreviations);
        }
    }

    public static function handle_post()
    {
        if(!isset($_SESSION["user_id"]))
        {
            http_response_code(401);
            echo json_encode(["error" => "You need to be logged in to create an abbreviation"]);
            return;
        }

        $content_type = $_SERVER["CONTENT_TYPE"] ?? "";

        try
        {
            if($content_type === "text/csv")
            {
                $body = file_get_contents("php://input");
                
                $dto = new AbbrMultipleInsertDTO();
                $dto->from_csv($body);
                
                $count = self::create_abbreviations_csv($dto);
                
                header("Content-Type: application/json");
                echo json_encode(["success" => true, "count" => $count]);
            }
            else
            {
                $body = file_get_contents("php://input");
                $data = json_decode($body, true);
                
                if(!isset($data["name"]) || !isset($data["short_expansion"]) || !isset($data["lang"]) || !isset($data["domain"]))
                {
                    http_response_code(400);
                    echo json_encode(["error" => "Missing required parameters"]);
                    return;
                }
                
                $dto = new AbbrInsertDTO($data["name"], $data["short_expansion"], $data["lang"], $data["domain"]);
                $abbreviation = self::create_abbreviation($dto);

                header("Content-Type: application/json");
                echo json_encode($abbreviation);
            }
        }
        catch(ApiException $e)
        {
            http_response_code($e->getHttpCode());
            echo json_encode(["error" => $e->getMessage()]);
        }
        catch(Exception $e)
        {
            http_response_code(500);
            echo json_encode(["error" => "Internal server error"]);
        }
    }

    public static function handle_request()
    {
        session_start();
        if($_SERVER["REQUEST_METHOD"] === "GET")
        {
            self::handle_get();
        }
        else if($_SERVER["REQUEST_METHOD"] === "POST")
        {
            self::handle_post();
        }
        else
        {
            http_response_code(400);
        }
    }
}

AbbreviationController::handle_request();

?>