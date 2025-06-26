<?php

namespace ama\controllers;

require_once( __DIR__ . "/../helpers/connection-helper.php");
require_once( __DIR__ . "/../repositories/statistics-repository.php");
require_once( __DIR__ . "/../exceptions/api-exception.php");
require_once("/tfpdf/tfpdf.php");

use ama\helpers\ConnectionHelper;
use ama\repositories\StatisticsRepository;
use ama\exceptions\ApiException;

class StatisticsController
{
    public static int $CELL_WIDTH = 40;

    public static function most_visited($format): ?string
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

        if($format == "json")
        {
            header("Content-Type: application/json");
            return json_encode($output);
        }
        else if($format == "csv")
        {
            header("Content-Type: text/csv");

            $text = "";

            foreach($output as $abbrev)
                $text .= $abbrev->searchable_name . "," . $abbrev->visits . "\n";
            return $text;
        }
        else //pdf
        {
            header("Content-Type: application/pdf");

            $pdf = new \tFPDF();
            $pdf->AddPage();
            $pdf->AddFont("DejaVuBold", "", "DejaVuSansCondensed-Bold.ttf", true);
            $pdf->SetFont("DejaVuBold", "", 16);
            $pdf->Cell(0, 20, "Most visited abbreviations", 0, 1, "C");
            $width = $pdf->GetPageWidth();

            $pdf->Cell($width / 2 - self::$CELL_WIDTH - 11);
            $pdf->Cell(self::$CELL_WIDTH, 20, "Abbreviation", 1, 0, "C");
            $pdf->Cell(self::$CELL_WIDTH, 20, "Visits", 1, 0, "C");
            $pdf->Ln();

            $pdf->AddFont("DejaVu", "", "DejaVuSansCondensed.ttf", true);
            $pdf->SetFont("DejaVu", "", 16);
            foreach($output as $abbrev)
            {
                $pdf->Cell($width / 2 - self::$CELL_WIDTH - 11);
                $pdf->Cell(self::$CELL_WIDTH, 20, $abbrev->searchable_name, 1, 0, "C");
                $pdf->Cell(self::$CELL_WIDTH, 20, $abbrev->visits, 1, 0, "C");
                $pdf->Ln();
            }
            
            return $pdf->Output("S");
        }
    }

    public static function most_controversial($format): ?string
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

        if($format == "json")
        {
            header("Content-Type: application/json");
            return json_encode($output);
        }
        else if($format == "csv")
        {
            header("Content-Type: text/csv");

            $text = "";

            foreach($output as $meaning)
                $text .= $meaning->id . ",\"" . $meaning->name . "\"," . $meaning->controversy . "\n";
            return $text;
        }
        else //pdf
        {
            header("Content-Type: application/pdf");

            $pdf = new \tFPDF();
            $pdf->AddPage();
            $pdf->AddFont("DejaVuBold", "", "DejaVuSansCondensed-Bold.ttf", true);
            $pdf->SetFont("DejaVuBold", "", 16);
            $pdf->Cell(0, 20, "Most controversial meanings", 0, 1, "C");
            $width = $pdf->GetPageWidth();

            $pdf->Cell($width / 2 - 1.5*self::$CELL_WIDTH - 11);
            $pdf->Cell(self::$CELL_WIDTH, 20, "Meaning ID", 1, 0, "C");
            $pdf->Cell(self::$CELL_WIDTH, 20, "Name", 1, 0, "C");
            $pdf->Cell(self::$CELL_WIDTH, 20, "Controversy", 1, 0, "C");
            $pdf->Ln();

            $pdf->AddFont("DejaVu", "", "DejaVuSansCondensed.ttf", true);
            $pdf->SetFont("DejaVu", "", 16);
            foreach($output as $meaning)
            {
                $pdf->Cell($width / 2 - 1.5*self::$CELL_WIDTH - 11);
                $pdf->Cell(self::$CELL_WIDTH, 20, $meaning->id, 1, 0, "C");
                $pdf->Cell(self::$CELL_WIDTH, 20, $meaning->name, 1, 0, "C");
                $pdf->Cell(self::$CELL_WIDTH, 20, $meaning->controversy, 1, 0, "C");
                $pdf->Ln();
            }
            
            return $pdf->Output("S");
        }
    }

    public static function highest_like_rate($format): ?string
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

        
        if($format == "json")
        {
            header("Content-Type: application/json");
            return json_encode($output);
        }
        else if($format == "csv")
        {
            header("Content-Type: text/csv");

            $text = "";

            foreach($output as $meaning)
                $text .= $meaning->id . ",\"" . $meaning->name . "\"," . $meaning->like_rate . "\n";
            return $text;
        }
        else //pdf
        {
            header("Content-Type: application/pdf");

            $pdf = new \tFPDF();
            $pdf->AddPage();
            $pdf->AddFont("DejaVuBold", "", "DejaVuSansCondensed-Bold.ttf", true);
            $pdf->SetFont("DejaVuBold", "", 16);
            $pdf->Cell(0, 20, "Highest like rates of meanings", 0, 1, "C");
            $width = $pdf->GetPageWidth();

            $pdf->Cell($width / 2 - 1.5*self::$CELL_WIDTH - 11);
            $pdf->Cell(self::$CELL_WIDTH, 20, "Meaning ID", 1, 0, "C");
            $pdf->Cell(self::$CELL_WIDTH, 20, "Name", 1, 0, "C");
            $pdf->Cell(self::$CELL_WIDTH, 20, "Like rate", 1, 0, "C");
            $pdf->Ln();

            $pdf->AddFont("DejaVu", "", "DejaVuSansCondensed.ttf", true);
            $pdf->SetFont("DejaVu", "", 16);
            foreach($output as $meaning)
            {
                $pdf->Cell($width / 2 - 1.5*self::$CELL_WIDTH - 11);
                $pdf->Cell(self::$CELL_WIDTH, 20, $meaning->id, 1, 0, "C");
                $pdf->Cell(self::$CELL_WIDTH, 20, $meaning->name, 1, 0, "C");
                $pdf->Cell(self::$CELL_WIDTH, 20, $meaning->like_rate, 1, 0, "C");
                $pdf->Ln();
            }
            
            return $pdf->Output("S");
        }
    }

    public static function most_active_users($format): ?string
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

        if($format == "json")
        {
            header("Content-Type: application/json");
            return json_encode($output);
        }
        else if($format == "csv")
        {
            header("Content-Type: text/csv");

            $text = "";

            foreach($output as $user)
                $text .= $user->name . "," . $user->activity . "\n";
            return $text;
        }
        else //pdf
        {
            header("Content-Type: application/pdf");

            $pdf = new \tFPDF();
            $pdf->AddPage();
            $pdf->AddFont("DejaVuBold", "", "DejaVuSansCondensed-Bold.ttf", true);
            $pdf->SetFont("DejaVuBold", "", 16);
            $pdf->Cell(0, 20, "Most active users", 0, 1, "C");
            $width = $pdf->GetPageWidth();

            $pdf->Cell($width / 2 - self::$CELL_WIDTH - 11);
            $pdf->Cell(self::$CELL_WIDTH, 20, "User", 1, 0, "C");
            $pdf->Cell(self::$CELL_WIDTH, 20, "Activity", 1, 0, "C");
            $pdf->Ln();

            $pdf->AddFont("DejaVu", "", "DejaVuSansCondensed.ttf", true);
            $pdf->SetFont("DejaVu", "", 16);
            foreach($output as $user)
            {
                $pdf->Cell($width / 2 - self::$CELL_WIDTH - 11);
                $pdf->Cell(self::$CELL_WIDTH, 20, $user->name, 1, 0, "C");
                $pdf->Cell(self::$CELL_WIDTH, 20, $user->activity, 1, 0, "C");
                $pdf->Ln();
            }
            
            return $pdf->Output("S");
        }
    }

    public static function median_abbreviation($format): ?string
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

        if($format == "json")
        {
            header("Content-Type: application/json");
            return json_encode($output);
        }
        else if($format == "csv") 
        {
            header("Content-Type: text/csv");

            $text = "";

            foreach($output as $abbrev) //only name, and only a single abbreviation
                $text .= $abbrev->searchable_name . "\n";
            return $text;
        }
        else //pdf
        {
            header("Content-Type: application/pdf");

            $pdf = new \tFPDF();
            $pdf->AddPage();
            $pdf->AddFont("DejaVuBold", "", "DejaVuSansCondensed-Bold.ttf", true);
            $pdf->SetFont("DejaVuBold", "", 16);
            $pdf->Cell(0, 20, "Median abbreviation ", 0, 1, "C");
            $width = $pdf->GetPageWidth();

            $pdf->Cell($width / 2 - 0.5*self::$CELL_WIDTH - 11);
            $pdf->Cell(self::$CELL_WIDTH, 20, "Abbreviation", 1, 0, "C");
            $pdf->Ln();

            $pdf->AddFont("DejaVu", "", "DejaVuSansCondensed.ttf", true);
            $pdf->SetFont("DejaVu", "", 16);
            foreach($output as $abbrev)
            {
                $pdf->Cell($width / 2 - 0.5*self::$CELL_WIDTH - 11);
                $pdf->Cell(self::$CELL_WIDTH, 20, $abbrev->searchable_name, 1, 0, "C");
                $pdf->Ln();
            }
            
            return $pdf->Output("S");
        }
    }

    public static function handle_get()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $query_components = array();
        parse_str($_SERVER['QUERY_STRING'], $query_components);

        $format = "json";
        if(isset($query_components["format"]))
        {
            $format = $query_components["format"];

            if($format != "json" && $format != "pdf" && $format != "csv")
                throw new ApiException(400, "Invalid export format for statistics");
        }

        if($url === "/statistics/most_visited")
        {
            $rez = StatisticsController::most_visited($format);
            echo $rez;
        }
        else if($url === "/statistics/most_controversial")
        {
            $rez = StatisticsController::most_controversial($format);
            echo $rez;
        }
        else if($url === "/statistics/highest_like_rate")
        {
            $rez = StatisticsController::highest_like_rate($format);
            echo $rez;
        }
        else if($url === "/statistics/most_active_users")
        {
            $rez = StatisticsController::most_active_users($format);
            echo $rez;
        }
        else if($url === "/statistics/median_abbreviation")
        {
            $rez = StatisticsController::median_abbreviation($format);
            echo $rez;
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