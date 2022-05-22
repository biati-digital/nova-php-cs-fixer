<?php

$rest_json = file_get_contents('php://input');
$data = json_decode($rest_json, true);

if (empty($data)) {
    echo json_encode(['success' => false, 'error' => 'empty', 'id' => 'phpcsfixer']);
    exit();
}

$file = $data['file'];
$command = $data['cmd'];
$config = $data['config'];

$command = implode(' ', $command);
$exec = shell_exec($command);

echo json_encode([
    'exec' => $exec,
    'success' => true,
    'command' => $command,
    'content' => file_get_contents($file),
    'id' => 'phpcsfixer'
]);
die();
