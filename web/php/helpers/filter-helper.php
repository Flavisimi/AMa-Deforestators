<?php

namespace ama\helpers;

class FilterHelper
{
    public static array $bad_words = ["PLM", "PULA", "PIZDA", "CUR", "CACAT", "PISAT", "FUTE", "FUTUTI", "FMM", "POPONAR", "KYS", "FUCK", "DICK", "COCK", "SHIT", "PISS", "ASSHOLE", "FUCKER"];
    
    public static function get_searchable_name($name)
    {
        $out = $name;

        $out = strtr($out, array("Â" => "A", "Ă" => "A", "â" => "a", "ă" => "a", "Î" => "I", "î" => "i", "Ș" => "S", "ș" => "s", "Ț" => "T", "ț" => "t"));
        $out = strtoupper($out);
        $out = str_replace(str_split(" 0123456789!@#$%^&*(),./;''[]-=<>?:\"{}|_+"), [], $out);
        return $out;
    }
    
    public static function filter_words($text): bool
    {
        $words = explode(" ", $text);
        foreach($words as $word)
        {
            $word = self::get_searchable_name($word);
            if($text == $word)
                return true;
        }
        
        return false;
    }
}

?>