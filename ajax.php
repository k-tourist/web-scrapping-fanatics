<?php

$data = json_decode(file_get_contents('php://input', true));

if ($data) {
    $ch = curl_init();

    curl_setopt($ch, CURLOPT_URL, $data->url);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    // curl_setopt($ch, CURLOPT_TIMEOUT, 1);

    $output = curl_exec($ch);

    curl_close($ch);  

    echo $output;
}

die();