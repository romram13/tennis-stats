package org.strangeforest.tcb.stats.spring;

import java.util.*;
import javax.servlet.http.*;

import org.springframework.boot.web.error.*;
import org.springframework.boot.web.servlet.error.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.*;

@RestController
public class ApiErrorController implements ErrorController {

	private final ErrorAttributes errorAttributes;

	public ApiErrorController(ErrorAttributes errorAttributes) {
		this.errorAttributes = errorAttributes;
	}

	@RequestMapping("${server.error.path:/error}")
	public ResponseEntity<Map<String, Object>> error(HttpServletRequest request) {
		var attributes = errorAttributes.getErrorAttributes(new ServletWebRequest(request), ErrorAttributeOptions.defaults());
		return ResponseEntity.status((Integer)attributes.get("status"))
			.contentType(MediaType.APPLICATION_JSON).body(attributes);
	}

	@Override public String getErrorPath() {
		return null;
	}
}
