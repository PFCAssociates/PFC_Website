<html>
<head>
<title>LEPS Video Interview Waiver</title>
<script language="JavaScript">
<!--
function gettime() {
    var date= new Date();
	var dow = date.getDay(); // Day of the week (0-6)(Sunday-Saturday)
	var dy = date.getDate(); // Day #
	var mt = date.getMonth()+1; // (January gives 0)
	var yr = date.getFullYear();
    var hr = date.getHours();
    var m = date.getMinutes();
    var s = date.getSeconds();
    var ampm="AM";
    if (hr > 11)
    {
        ampm="PM"
    }
    if (hr > 12)
    {
        hr -= 12
    }
    if(m < 10)
    {
        m = "0" + m
    }
    if(s < 10)
    {
        s = "0" + s
    }
	
	var wkdy ="Sunday";
	
	if (dow == 1)
    {
        wkdy="Monday"
    }
	if (dow == 2)
    {
        wkdy="Tuesday"
    }
	if (dow == 3)
    {
        wkdy="Wednesday"
    }
	if (dow == 4)
    {
        wkdy="Thursday"
    }
	if (dow == 5)
    {
        wkdy="Friday"
    }
	if (dow == 6)
    {
        wkdy="Saturday"
    }
	
	//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getDay
	//http://www.java2s.com/Tutorial/JavaScript/0580__Animation/Countdowntimer.htm
	
	//document.clockform.clock.value = hr + ":" + m + ":" + s + " " +ampm;
	//document.clockform.clock.value = wkdy + " " + mt + "/" + dy + "/" + yr + " " + hr + ":" + m + ":" +  s + " " +ampm;
	
	
	//next to implement | add sick call has ended, next sick call starts in x hours x minutes. | and add Sick call in progress/ currently open, and ends in x hours x minutes. add green color if open red if closed
	
	
	document.getElementById("shadowclock").innerHTML = wkdy + " | " + mt + "/" + dy + "/" + yr + " | " + hr + ":" + m + ":" + s + " " +ampm;
	
    setTimeout("gettime()",100)
	
	
	
}
//  -->
</script>
</head>
<body onload="gettime()">

	
	<p align="right" id="shadowclock"></p>

		
	<?php


//$fullname = $_GET["invitee_full_name"];
		
$firstname = $_GET["invitee_first_name"];
	
	//removes appostrophe for names like O'Connell
	$firstname = str_replace('\'', '', $firstname);
	
	//$strWithSlashes = filter_var($str, FILTER_SANITIZE_ADD_SLASHES);
	//$firstname = addslashes($firstname);
	//$firstname = str_replace($firstname, "'", '-');
	
	//$lastname = $_GET["invitee_last_name"];
	
	$lastname = $_GET["invitee_last_name"];
	
	//$lastname = filter_var($lastname, FILTER_SANITIZE_ADD_SLASHES);
	
	
	//$lastname = addslashes($lastname);
	//$lastname = str_replace($lastname, "'", '-');
	
	$lastname = str_replace('\'', '', $lastname);
	
	
	$answer1 = $_GET["answer_1"];
	
	$answer2 = $_GET["answer_2"];
	
	$authcode = $_GET["user_token"];
	
	$redirectorigin = $_GET["redir_origin"];
		
$mergedfullname = $firstname.' '.$lastname;

$email = $_GET["invitee_email"];

$startdate = $_GET["event_start_time"];
		
	//echo $startdate;	
	//	echo "<br>";
		
$confirmationstartdate = $_GET["event_date"];		
		
			//echo $confirmationstartdate;	
		//echo "<br>";

$date = substr($startdate, strpos($startdate, "&event_start_time="), 10);

$convertdate = date("20y-m-d", strtotime($confirmationstartdate)); 
				//	echo "convertdate " . $convertdate;	
		//echo "<br>";
		
	$unfixdate = $date.$convertdate;	
		//echo "unfixdate " . $unfixdate;	
		
		//echo "<br>";
$fixdate = substr($unfixdate, strpos($unfixdate, ""), 10);
		//echo "fixdate " . $fixdate;	
		
		//echo "<br>";
//echo "Hello, ".$name;
//echo "moment of truth Mr -> ".$_GET["invitee_full_name"];
		
echo "<iframe src='https://formfacade.com/headless/112964348896262839040/home/form/1FAIpQLSfTAVp4aqrrUhjSDC7snBCiq_VxzQXonu4xRXMBv_RWz4B91w?usp=pp_url&entry.1677337926=$mergedfullname&entry.498707961=$firstname&entry.1219613128=$lastname&entry.895715130=$email&entry.401353025=$answer1&entry.941374359=$answer2&entry.2147330626=$fixdate&entry.1188964792=$redirectorigin&entry.545973129=$authcode' scrolling='no' frameBorder='0' width='100%' style='height:90%';></iframe>";
	?>
	
	
	
</body>
</html>



<!--75% without fullscreen, 67% with fullscreen.exactly 80% full screen with error entry -->


<p>Date/Time Page Loaded: <span id="datetime"></span></p>

<script>
var dt = new Date();
document.getElementById("datetime").innerHTML = dt.toLocaleString();
</script>

