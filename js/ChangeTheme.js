/*jshint esversion: 6 */

document.getElementById('lightswitch').addEventListener('click', function () 
						
{
   "use strict"; let darkThemeEnabled = document.body.classList.toggle('dark-theme');
	
    localStorage.setItem('dark-theme-enabled', darkThemeEnabled);
});


if (JSON.parse(localStorage.getItem('dark-theme-enabled'))) 

{
    document.body.classList.add('dark-theme');
}

