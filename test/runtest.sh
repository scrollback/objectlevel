#!/bin/sh
echo 3 > /proc/sys/vm/drop_caches
node --expose-gc --nouse-idle-notification fstest.js 4096 411439297
echo 3 > /proc/sys/vm/drop_caches
node --expose-gc --nouse-idle-notification fstest.js 8192 411439297
echo 3 > /proc/sys/vm/drop_caches
node --expose-gc --nouse-idle-notification fstest.js 12288 411439297
echo 3 > /proc/sys/vm/drop_caches
node --expose-gc --nouse-idle-notification fstest.js 16384 411439297
echo 3 > /proc/sys/vm/drop_caches
node --expose-gc --nouse-idle-notification fstest.js 20480 411439297
