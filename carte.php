<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">

        <title>Carte DG</title>
    </head>
    <body>
        <div id="page">

            <!-- Begin Encart Module -->
            <div id="cl-module">
                <link rel="stylesheet" href="css/style.css">
                <h2 class="map-title">Actions de la Philharmonie de Paris en France et à l'international</h2>
                <section id="mapDG-container">
                    <aside id="mapDG-filter-container">
                        <div class="filter-header">
                            <h3>Rechercher</h3>
                            <p id="results"><b></b> Action(s)</p>
                        </div>
                        <div id="prospect-filter"></div>


                        <form class="search-bar" action="" id="search-bar">
                            <div id="search-field">
                                <input type="text" id="seeker" placeholder="Action, Ville..." /> 
                                <button id="search" class="btn btn-default" type="submit" aria-label="Rechercher"> 
                                    <img src="./img/search.svg" alt="Rechercher" loading="lazy" /> 
                                </button>
                            </div>
                        </form>

                        <h3>Filtrer par type d'action</h3>
                        <fieldset id="type_action_container">
                            <!-- A Générer dynamiquement : Autres options -->

                            <!-- END A Générer dynamiquement -->

                        </fieldset>

                        <button role="button" id="access-button" class="btn btn-default">Version accessible</button>

                    </aside>

                    <button id="open-close-filter" type="button" aria-pressed="false"> 
                        <p>Filtres</p>
                    </button>

                    </button>
                    <div id="mapDG" class="keep-style"></div>
                    <div class="loader"></div>
                </section>
                <!-- Leaflet -->
                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
                <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>

                <!-- Fullscreen -->
                <link rel="stylesheet" href="js/fullscreen/Control.FullScreen.css" />
                <script src="js/fullscreen/Control.FullScreen.js"></script>

                <!-- MarkerCluster -->
                <script src="js/markerCluster/dist/leaflet.markercluster.js"></script>
                <link rel="stylesheet" href="js/markerCluster/dist/MarkerCluster.css" />
                <link rel="stylesheet" href="js/markerCluster/dist/MarkerCluster.Default.css" />

                <!-- Subgroup -->
                <script src="js/subgroup/src/subgroup.js"></script>
                <!-- Après les scripts Leaflet et Leaflet.markercluster -->
                <!-- <script src="js/subgroup/src/leaflet.markercluster.layersupport.js"></script> -->


                <!-- jQuery -->
                <script src="https://code.jquery.com/jquery-3.7.1.min.js" integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=" crossorigin="anonymous"></script>
                
                <!-- Script -->
                <script src="js/map.js"></script>
            </div>
            <!-- END Encart Module -->
        </div>
    </body>
</html>