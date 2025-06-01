<?php

require_once( __DIR__ . "/controllers/abbreviation-controller.php");

header("Content-Type: application/json");

echo json_encode(AbbreviationController::get_all_abbreviations());

?>