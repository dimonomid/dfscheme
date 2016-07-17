# DFScheme: a Scheme interpreter written in JavaScript

So far, DFScheme is a very basic Scheme implementation, which however already
supports tail-call optimization, for both direct and indirect tail calls to the
same function.

Initially I wrote it in order to run Scheme on a microcontroller. So I had a
Scheme interpreter, running in the JavaScript engine, running on an MCU. If it
sounds insane, don't worry, because it is.

You can find a full article here:
[Let's Run Lisp on a Microcontroller](http://dmitryfrank.com/articles/lisp_on_mcu)
