package org.strangeforest.tcb.dataload

// Delta imports use the same CSV source as full imports.
System.setProperty(LoadParams.FULL_LOAD_PROPERTY, 'false')
new LoadATPTennis().run()
