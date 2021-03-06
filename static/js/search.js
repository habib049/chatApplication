window.addEventListener('load', (event) => {
    $(function () {
        $("#searchInput").autocomplete({
            source: '',
            minLength: 1
        });
    });
})