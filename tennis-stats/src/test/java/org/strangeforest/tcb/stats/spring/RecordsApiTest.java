package org.strangeforest.tcb.stats.spring;

import org.junit.jupiter.api.Test;
import org.strangeforest.tcb.stats.controller.RecordsResource;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class RecordsApiTest {
    @Test void exposesPresentationMetadataWithoutSql() throws Exception {
        MockMvcBuilders.standaloneSetup(new RecordsResource()).build()
            .perform(get("/records/Titles"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Most Titles"))
            .andExpect(jsonPath("$.category").value("Most Titles"))
            .andExpect(jsonPath("$.columns[0].name").value("value"))
            .andExpect(jsonPath("$.columns[0].caption").value("Titles"))
            .andExpect(jsonPath("$.sql").doesNotExist());
    }
    @Test void rejectsUnknownRecord() throws Exception {
        MockMvcBuilders.standaloneSetup(new RecordsResource()).build()
            .perform(get("/records/DoesNotExist"))
            .andExpect(status().isNotFound());
    }
}
