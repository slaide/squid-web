# squid-web
pharmbio/squid but with web frontend

the pharmbio/squid software is used to control a new microscope, with full open-source hardware and software design.
the current implementation of the graphical user interface (GUI) uses python and the Qt framework. This makes it very difficult to maintain, and also to add new features, which we do (or at least want to) on a regular basis. python+Qt also makes containerization very difficult, which is not great for our environment where things change frequently.

to overcome these issues, this repository aims to implement the GUI as a web-frontend that communicates with a back-end via an http connection. This allows the backend to run inside a virtual environment, and even opens up the possibility of interacting with the hardware remotely.
