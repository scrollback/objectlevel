# Type Data Keys
	duser|aravind		{ ... }
	droom|scrollback	{ ... }

# Type Index Keys
	iuser:memberOf|scrollback|aravind
	iroom:hasMember|aravind|scrollback

# Link Data Keys
	droom:hasMember:user:memberOf|scrollback|aravind	{ ... }

# Link Index Keys
	iuser:memberOf:role|scrollback|follower|aravind		<- get all followers of scrollabck
	iroom:hasMember:role|aravind|follower|scrollback	<- get all rooms aravind is a follower of

