package org.strangeforest.tcb.stats.spring;

import javax.servlet.http.*;

import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.stereotype.*;
import org.springframework.web.servlet.handler.*;

@Component @ConditionalOnProperty("tennis-stats.down-for-maintenance")
public class DownForMaintenanceInterceptor extends HandlerInterceptorAdapter {

	@Override public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
		if (request.getRequestURI().startsWith(request.getContextPath() + "/actuator/health"))
			return true;
		response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
		response.setContentType("application/json");
		response.setHeader("Retry-After", "300");
		response.getWriter().write("{\"status\":503,\"error\":\"Service unavailable\"}");
		return false;
	}
}
