<?php
namespace docker {
	function adminer_object() {
		final class AutoLoginPlugin extends \Adminer\Plugin {
			public function credentials() {
				$server = getenv('ADMINER_DEFAULT_SERVER') ?: 'db';
				$user = getenv('POSTGRES_USER') ?: 'postgres';
				$pass = getenv('POSTGRES_PASSWORD') ?: 'postgres';
				return [$server, $user, $pass];
			}
			public function login($login, $password) {
				return true;
			}
			public function database() {
				return getenv('POSTGRES_DB') ?: 'ai_ecosystem';
			}
			public function verifyLoginToken() {
				return false;
			}
		}

		$plugins = [];
		foreach (glob('plugins-enabled/*.php') as $plugin) {
			$plugins[] = require($plugin);
		}

		$plugins[] = new AutoLoginPlugin();
		return new \Adminer\Plugins($plugins);
	}
}

namespace {
	$server = getenv('ADMINER_DEFAULT_SERVER') ?: 'db';
	$user = getenv('POSTGRES_USER') ?: 'postgres';
	$pass = getenv('POSTGRES_PASSWORD') ?: 'postgres';
	$db = getenv('POSTGRES_DB') ?: 'ai_ecosystem';

	if (empty($_GET['username']) && empty($_POST)) {
		$_POST['auth'] = [
			'driver' => 'pgsql',
			'server' => $server,
			'username' => $user,
			'password' => $pass,
			'db' => $db
		];
	}

	if (basename($_SERVER['DOCUMENT_URI'] ?? $_SERVER['REQUEST_URI']) === 'adminer.css' && is_readable('adminer.css')) {
		header('Content-Type: text/css');
		readfile('adminer.css');
		exit;
	}

	function adminer_object() {
		return \docker\adminer_object();
	}

	require('adminer.php');
}
