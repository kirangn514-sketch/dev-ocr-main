// Initialization for custom Swagger UI (StandaloneLayout)
document.addEventListener('DOMContentLoaded', function() {
    const ui = SwaggerUIBundle({
        url: '/docs/swagger.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        plugins: [
            SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        tryItOutEnabled: true,
        requestInterceptor: (request) => {
            request.headers['Content-Type'] = 'application/json';
            return request;
        },
        onComplete: function() {
            console.log("Swagger UI loaded successfully");
        }
    });
    window.ui = ui;
});
