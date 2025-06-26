<?php

namespace ama\controllers;

require_once( __DIR__ . "/../helpers/connection-helper.php");
require_once( __DIR__ . "/../repositories/statistics-repository.php");
require_once( __DIR__ . "/../exceptions/api-exception.php");

use ama\helpers\ConnectionHelper;
use ama\repositories\StatisticsRepository;
use ama\exceptions\ApiException;

class RssController
{
    public static function rss_feed(): \SimpleXMLElement
    {
        $conn = ConnectionHelper::open_connection();
        try
        {
            $visited = StatisticsRepository::most_visited($conn);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }

        oci_close($conn);
        
        $output = new \SimpleXMLElement("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<rss version=\"2.0\"><channel><title>Abbreviation Management</title><link>http://ama-deforestators/</link><description>Search and manage your favorite abbreviations!</description></channel></rss>");

        $channel = $output->channel;
        foreach($visited as $abbr)
        {
            $item = $channel->addChild("item");
            $item->addChild("title", $abbr->searchable_name);
            $item->addChild("guid", $abbr->id);
            $item->addChild("pubDate", $abbr->created_at->format("Y-m-d"));

            $visits_text = $abbr->visits == 1 ? " visit" : " visits";
            $item->addChild("description", $abbr->visits . $visits_text);
        }

        return $output;
    }

    public static function handle_get()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $query_components = array();
        parse_str($_SERVER['QUERY_STRING'], $query_components);

        if($url === "/api/rss")
        {
            $rez = RssController::rss_feed();
            header("Content-Type: application/rss+xml");
            echo (string)($rez->asXML());
        }
        else
        {
            http_response_code(400);
        }
    }
    
    public static function handle_request()
    {
        //session_start();
        if($_SERVER['REQUEST_METHOD'] === 'GET')
            RssController::handle_get();
        else
        {
            http_response_code(400);
        }
    }
}

try
{
    RssController::handle_request();
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