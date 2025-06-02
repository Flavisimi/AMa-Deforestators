<?php

namespace ama\exceptions;

use Throwable;

class ApiException extends \Exception
{
    public int $status_code;
    public string $err_msg;

    public function __construct(int $status_code, string $err_msg)
    {
        $this->status_code = $status_code;
        $this->err_msg = $err_msg;
    }
}

?>