<?php

namespace ama\models;

class User
{
    public int $id;
    public string $name;
    public string $role;
    public string $email;
    public string $description;
    public string $date_of_birth;
    public string $profile_picture;
    public \DateTime $created_at;
    public \DateTime $updated_at;
}