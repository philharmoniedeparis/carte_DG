<footer id="footer" class="site-content" tabindex="-1">
    <figure class="logo">
        <?php 
        $logo = get_theme_mod( 'custom_logo', 'full' );
        $logoUrl = wp_get_attachment_image_src( $logo , 'full' )[0];
        echo '<img src="' . esc_url($logoUrl) . '" alt="Logo">';
        ?>
    </figure>
    <section class="menu-footer">
        <nav>
            <?php wp_nav_menu( array( 'container_class' => 'main-nav', 'theme_location' => 'footer_menu' ) ); ?>
        </nav><!-- .main -->
    </section>
</footer>
<?php wp_footer(); ?>
