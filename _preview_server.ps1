# Temporary preview server for CodeShare (no Python required)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 5000
$prefix = "http://127.0.0.1:$port/"

function Get-HtmlEscape([string]$s) {
    return ($s -replace '&', '&amp;' -replace '<', '&lt;' -replace '>', '&gt;')
}

function Detect-Language([string]$code) {
    $scores = @{}
    $patterns = @{
        python     = @('\bdef\s+\w+\s*\(', '\bclass\s+\w+', '\bimport\s+\w+', '\bprint\s*\(')
        javascript = @('\bfunction\s*\w*\s*\(', '\bconst\s+\w+\s*=', '\blet\s+\w+\s*=', '\bconsole\.log\s*\(')
        java       = @('\bpublic\s+(static\s+)?(void|int|String)', '\bSystem\.out\.print')
        cpp        = @('#include\s*<\w+>', '\bstd::', '\bcout\s*<<')
        c          = @('#include\s*<\w+>', '\bprintf\s*\(', '\bmalloc\s*\(')
        php        = @('<\?php', '\$\w+\s*=', '\becho\s+')
        ruby       = @('\bdef\s+\w+', '\bputs\s+', '\bend\s*$')
        go         = @('\bfunc\s+\w*\s*\(', '\bpackage\s+\w+', ':=\s*')
        rust       = @('\bfn\s+\w+\s*\(', '\blet\s+(mut\s+)?\w+\s*=')
        html       = @('<!DOCTYPE\s+html>', '<html', '<div')
        css        = @('\{\s*[\w-]+\s*:', '@media\s*\(')
        sql        = @('\bSELECT\s+', '\bINSERT\s+INTO', '\bCREATE\s+TABLE')
        bash       = @('^#!/bin/(ba)?sh', '\becho\s+', '\bexport\s+')
        json       = @('^\s*\{', '"\w+"\s*:')
        yaml       = @('^\w+:\s*$', '^\s+-\s+\w+')
    }
    foreach ($lang in $patterns.Keys) {
        $score = 0
        foreach ($p in $patterns[$lang]) {
            $score += [regex]::Matches($code, $p, 'Multiline').Count
        }
        if ($score -gt 0) { $scores[$lang] = $score }
    }
    if ($scores.Count -eq 0) { return 'plaintext' }
    return ($scores.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 1).Key
}

function Highlight-Code([string]$code, [string]$language) {
    $escaped = Get-HtmlEscape $code
    if ($language -eq 'plaintext') { return $escaped }
    $escaped = [regex]::Replace($escaped, '(#.*$|//.*$)', '<span class="token-comment">$0</span>', 'Multiline')
    $escaped = [regex]::Replace($escaped, '("(?:\\.|[^"\\])*"|''(?:\\.|[^''\\])*'')', '<span class="token-string">$0</span>')
    $escaped = [regex]::Replace($escaped, '\b(def|class|function|const|let|var|if|else|for|while|return|import|from|public|private|fn|func|package)\b', '<span class="token-keyword">$0</span>')
    return $escaped
}

function Read-Body($req) {
    $reader = New-Object System.IO.StreamReader($req.InputStream, $req.ContentEncoding)
    try { return $reader.ReadToEnd() } finally { $reader.Close() }
}

function Write-Response($res, [int]$status, [string]$contentType, [string]$body, [byte[]]$bytes = $null) {
    $res.StatusCode = $status
    $res.ContentType = $contentType
    if ($null -ne $bytes) {
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $buf = [System.Text.Encoding]::UTF8.GetBytes($body)
        $res.ContentLength64 = $buf.Length
        $res.OutputStream.Write($buf, 0, $buf.Length)
    }
    $res.OutputStream.Close()
}

$snippets = New-Object System.Collections.Generic.List[object]
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "CodeShare preview at $prefix"

while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    $path = $req.Url.AbsolutePath
    $method = $req.HttpMethod
    try {
        if ($method -eq 'GET' -and $path -eq '/') {
            $html = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'templates\index.html')
            $html = $html.Replace("{{ url_for('static', filename='style.css') }}", '/static/style.css')
            $html = $html.Replace("{{ url_for('static', filename='app.js') }}", '/static/app.js')
            Write-Response $res 200 'text/html; charset=utf-8' $html
        }
        elseif ($method -eq 'GET' -and $path.StartsWith('/static/')) {
            $rel = $path.Substring('/static/'.Length)
            $file = Join-Path (Join-Path $root 'static') $rel
            if (-not (Test-Path $file)) { Write-Response $res 404 'text/plain' 'Not found'; continue }
            $ext = [IO.Path]::GetExtension($file).ToLowerInvariant()
            $ct = switch ($ext) { '.css' { 'text/css' } '.js' { 'application/javascript' } default { 'application/octet-stream' } }
            $bytes = [IO.File]::ReadAllBytes($file)
            Write-Response $res 200 $ct '' $bytes
        }
        elseif ($method -eq 'POST' -and $path -eq '/api/detect') {
            $data = Read-Body $req | ConvertFrom-Json
            $lang = Detect-Language ([string]$data.code)
            $json = @{ detected_language = $lang; available_languages = @('python','javascript','java','cpp','c','php','ruby','go','rust','html','css','sql','bash','json','yaml','plaintext') } | ConvertTo-Json -Compress
            Write-Response $res 200 'application/json' $json
        }
        elseif ($method -eq 'POST' -and $path -eq '/api/highlight') {
            $data = Read-Body $req | ConvertFrom-Json
            $html = Highlight-Code ([string]$data.code) ([string]$data.language)
            $json = @{ highlighted_code = $html; language = $data.language } | ConvertTo-Json -Compress
            Write-Response $res 200 'application/json' $json
        }
        elseif ($method -eq 'GET' -and $path -eq '/api/snippets') {
            $arr = @($snippets.ToArray())
            [array]::Reverse($arr)
            $json = @{ snippets = @($arr) } | ConvertTo-Json -Compress -Depth 6
            Write-Response $res 200 'application/json' $json
        }
        elseif ($method -eq 'DELETE' -and $path -match '^/api/snippets/(.+)$') {
            $id = [Uri]::UnescapeDataString($Matches[1])
            $removed = $false
            for ($i = $snippets.Count - 1; $i -ge 0; $i--) {
                if ([string]$snippets[$i].id -eq $id) {
                    $snippets.RemoveAt($i)
                    $removed = $true
                    break
                }
            }
            if ($removed) { Write-Response $res 200 'application/json' '{"success":true}' }
            else { Write-Response $res 404 'application/json' '{"error":"Not found"}' }
        }
        elseif ($method -eq 'GET' -and $path -match '^/api/snippets/(.+)$') {
            $id = [Uri]::UnescapeDataString($Matches[1])
            $found = $null
            foreach ($s in $snippets) { if ([string]$s.id -eq $id) { $found = $s; break } }
            if ($null -eq $found) { Write-Response $res 404 'application/json' '{"error":"Not found"}' }
            else {
                $json = @{ snippet = $found } | ConvertTo-Json -Compress -Depth 6
                Write-Response $res 200 'application/json' $json
            }
        }
        elseif ($method -eq 'POST' -and $path -eq '/api/snippets') {
            $data = Read-Body $req | ConvertFrom-Json
            $code = [string]$data.code
            $language = [string]$data.language
            if (-not $code) { Write-Response $res 400 'application/json' '{"error":"No code provided"}'; continue }
            if ($language -eq 'auto' -or -not $language) { $language = Detect-Language $code }
            $title = if ($data.title) { [string]$data.title } else { 'Untitled Snippet' }
            $id = if ($data.id) { [string]$data.id } else { [string]($snippets.Count + 1) }
            $created = if ($data.created_at) { [string]$data.created_at } else { [DateTime]::Now.ToString('o') }
            $snippet = @{
                id = $id
                title = $title
                code = $code
                language = $language
                highlighted_code = (Highlight-Code $code $language)
                created_at = $created
            }
            $snippets.Add($snippet) | Out-Null
            $json = @{ success = $true; snippet = $snippet } | ConvertTo-Json -Compress -Depth 6
            Write-Response $res 201 'application/json' $json
        }
        else {
            Write-Response $res 404 'text/plain' 'Not found'
        }
    }
    catch {
        Write-Response $res 500 'text/plain' $_.Exception.Message
    }
}
