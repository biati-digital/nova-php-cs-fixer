# Aditional HTML/PHP Fixes

This extensions apart from beautifying HTML and PHP it handle some cases when PHP has inlined HTML and some results are not what we are expecting, here are examples of those errors and the applied fix, this file will keep a record all the fixes implemented

### Fix Inlined HTML fix id 1: example

Code before fix

```php
function add_google_analytics()
{
    if (!is_user_logged_in()) {
        ?>
<!--Google Analytics-->
<script type="text/javascript">
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-XXXXXXXX-X']);
_gaq.push(['_trackPageview']);
_gaq.push(['_trackPageLoadTime']);
(function() {
    var ga = document.createElement('script');
    ga.type = 'text/javascript';
    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
})();
</script>
<?php
    }
}
add_action('wp_footer', 'add_google_analytics');


function head_favicons()
{
    $url = get_stylesheet_directory_uri() . '/static/favicons'; ?>
<link rel="icon" type="image/png" href="<?php echo $url; ?>/favicon.png">
<?php
}
add_action('wp_head', 'head_favicons', 11);
```

Code after fix

```php
function add_google_analytics()
{
    if (!is_user_logged_in()) {
        ?>
        <!--Google Analytics-->
        <script type="text/javascript">
        var _gaq = _gaq || [];
        _gaq.push(['_setAccount', 'UA-XXXXXXXX-X']);
        _gaq.push(['_trackPageview']);
        _gaq.push(['_trackPageLoadTime']);
        (function() {
            var ga = document.createElement('script');
            ga.type = 'text/javascript';
            ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
        })();
        </script>
        <?php
    }
}
add_action('wp_footer', 'add_google_analytics');


function head_favicons()
{
    $url = get_stylesheet_directory_uri() . '/static/favicons'; ?>
    <link rel="icon" type="image/png" href="<?php echo $url; ?>/favicon.png">
    <?php
}
add_action('wp_head', 'head_favicons', 11);
```

### Fix Inlined HTML fix id 2: example

The formatters will respect the spaces you leave

Code before fix

```php
}?>
```

Code after fix

```php
} ?>
```

### Fix Inlined HTML no space between closing PHP tag and opening HTML Tag id 3: example ( this is not a problem with the formatters, if you leav a new line and your code it's correctly indented it will be respected, this is only if you have a file with really bad code)

Code before fix

```php
?> <h5>
    <?php echo $title; ?>
</h5>
?><h5>
    <?php echo $title; ?>
</h5>
<?php
```

Code after fix

```php
?>
<h5>
    <?php echo $title; ?>
</h5>
<?php
```


### Fix PHP start tag indentation when PHP block is inside HTML and indentation level is at 0, fix id 4

Code before fix

```php
    <?php
echo 'Nova';
if (isset($panic)) {
    echo 'No';
} else {
    echo 'blah blah';
}
?>
```

Code after fix

```php
<?php
echo 'Nova';
if (isset($panic)) {
    echo 'No';
} else {
    echo 'blah blah';
}
?>
```


### Fix PHP inside HTML script tags, fix id 5

Code before fix

```php
<script>
    const example = < ? php echo json_encode($this - > json); ? > ;
    const example2 = < ? php echo json_encode($params); ? > ;
</script>
```

Code after fix

```php
<script>
    const example = <?php echo json_encode($this->json); ?>;
    const example2 = <?php echo json_encode($params); ?>;
</script>
```