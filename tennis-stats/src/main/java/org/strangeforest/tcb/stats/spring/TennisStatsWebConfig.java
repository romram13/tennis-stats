package org.strangeforest.tcb.stats.spring;

import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.boot.context.properties.*;
import org.springframework.context.annotation.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.config.annotation.*;

@Configuration @ConditionalOnWebApplication
@EnableConfigurationProperties(ServerSSLProperties.class)
public class TennisStatsWebConfig implements WebMvcConfigurer {

	@Autowired(required = false) private DownForMaintenanceInterceptor downForMaintenanceInterceptor;
	@Value("${tennis-stats.api.allowed-origins:}") private String[] allowedOrigins;

	@Override public void addInterceptors(InterceptorRegistry registry) {
		registry.addInterceptor(new RequestURLLoggingHandlerInterceptor());
		if (downForMaintenanceInterceptor != null)
			registry.addInterceptor(downForMaintenanceInterceptor);
	}

	@Override public void configurePathMatch(PathMatchConfigurer configurer) {
		configurer.addPathPrefix("/api/v1", type ->
			type.getPackageName().startsWith("org.strangeforest.tcb.stats.controller")
				&& type.isAnnotationPresent(RestController.class));
	}

	@Override public void addCorsMappings(CorsRegistry registry) {
		if (allowedOrigins.length > 0)
			registry.addMapping("/api/v1/**").allowedOrigins(allowedOrigins).allowedMethods("GET");
	}
}
