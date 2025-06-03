<?php

namespace ama\controllers;

require_once( __DIR__ . "/../helpers/connection-helper.php");
require_once( __DIR__ . "/../repositories/statistics-repository.php");
require_once( __DIR__ . "/../exceptions/api-exception.php");

use ama\helpers\ConnectionHelper;
use ama\repositories\StatisticsRepository;
use ama\exceptions\ApiException;

class StatisticsController
{
    public static function most_visited(): ?array
    {
        $conn = ConnectionHelper::open_connection();
        try
        {
            $output = StatisticsRepository::most_visited($conn);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }

        oci_close($conn);
        return $output;
    }

    public static function most_controversial(): ?array
    {
        $conn = ConnectionHelper::open_connection();
        try
        {
            $output = StatisticsRepository::most_controversial($conn);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }

        oci_close($conn);
        return $output;
    }

    public static function highest_like_rate(): ?array
    {
        $conn = ConnectionHelper::open_connection();
        try
        {
            $output = StatisticsRepository::highest_like_rate($conn);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }

        oci_close($conn);
        return $output;
    }

    public static function most_active_users(): ?array
    {
        $conn = ConnectionHelper::open_connection();
        try
        {
            $output = StatisticsRepository::most_active_users($conn);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }

        oci_close($conn);
        return $output;
    }

    public static function median_abbreviation(): ?array
    {
        $conn = ConnectionHelper::open_connection();
        try
        {
            $output = StatisticsRepository::median_abbreviation($conn);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }

        oci_close($conn);
        return $output;
    }

    public static function handle_get()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $query_components = array();
        parse_str($_SERVER['QUERY_STRING'], $query_components);

        if($url === "/statistics/most_visited")
        {
            $rez = StatisticsController::most_visited();
            header("Content-Type: application/json");
            echo json_encode($rez);
        }
        else if($url === "/statistics/most_controversial")
        {
            $rez = StatisticsController::most_controversial();
            header("Content-Type: application/json");
            echo json_encode($rez);
        }
        else if($url === "/statistics/highest_like_rate")
        {
            $rez = StatisticsController::highest_like_rate();
            header("Content-Type: application/json");
            echo json_encode($rez);
        }
        else if($url === "/statistics/most_active_users")
        {
            $rez = StatisticsController::most_active_users();
            header("Content-Type: application/json");
            echo json_encode($rez);
        }
        else if($url === "/statistics/median_abbreviation")
        {
            $rez = StatisticsController::median_abbreviation();
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
            StatisticsController::handle_get();
        else
        {
            http_response_code(400);
        }
    }
}

try
{
    StatisticsController::handle_request();
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