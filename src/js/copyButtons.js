(function () {
    document.body.addEventListener('click', function (e) {
        var b = e.target.closest('.aCopyCodeButton');
        if (b) {
            var code = b.closest('pre').querySelector('code'),
                icon = b.querySelector('svg use');
            try {
                navigator.clipboard.writeText(code.innerText);
                if (icon.getAttribute('xlink:href') !== '/icons.svg#check-square') {
                    icon.setAttribute('xlink:href', '/icons.svg#check-square');
                    setTimeout(function () {
                        icon.setAttribute('xlink:href', '/icons.svg#copy');
                    }, 1500);
                }
            } catch (ee) {
                console.warn(ee);
                console.log(code);
            }
        }
    });
})();
