<?php

namespace ama\models;

class User
{
    public int $id;
    public string $name;
    public string $role;
    public string $email;
    public \DateTime $created_at;
    public \DateTime $updated_at;
}
?>