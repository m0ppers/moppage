+++
title = "Uberspace and letsencrypt"
date = 2015-10-26
+++
Another beta account :D I applied for [letsencrypt](https://letsencrypt.org/) and got accepted for their closed beta :D Maybe the reason I got accepted was my special domain: I think it is very likely that I am the only .koeln letsencrypt user so far.

Setting up letsencrypt was pretty easy and generally works as described:

```
git clone https://github.com/letsencrypt/letsencrypt
  cd letsencrypt
  ./letsencrypt-auto --agree-dev-preview --server \
      https://acme-v01.api.letsencrypt.org/directory auth
```

letsencrypt-auto will automatically install the required libraries via brew (on the mac). My local brew had some problems but after updating and brew doctor everything worked smoothely. Afterwards a little cli ui will guide you through the registration process and ultimately it will generate a little [Jose](http://jose.readthedocs.org/en/latest/) content which you have to place on your webserver at the location indicated. It MUST be served using "application/jose+json".

```
Make sure your web server displays the following content at
http://mop.koeln/blablalala/blalalala/LALALALALALA before continuing:

{"header": {"alg": "RS256", "jwk": {"e": "AQAB", "kty": "RSA", "n": .........}}}

Content-Type header MUST be set to application/jose+json.
```

## Apache Content-Types

Uberspace is hosting everything via apache. So to serve the file with the correct Content-Type you need to configure it properly. To do this I placed a .htaccess in the directory where I placed the Jose+JSON file:

```
<Files "the filename of the jose+json file">
ForceType 'application/jose+json'
</Files>
```

I verified that everything is correctly set up using [Postman](https://www.getpostman.com/) but cURL works as well. Finally press ENTER and if everything worked it will generate a proper certificate and key:

```
[...]
 - Congratulations! Your certificate and chain have been saved at
   /etc/letsencrypt/live/mop.koeln/fullchain.pem. Your cert will
   expire on 2016-01-23. To obtain a new version of the certificate in
   the future, simply run Let's Encrypt again.
[...]
```

## Setting up uberspace

So far letsencrypt has provided us with a directory providing everything we need to set up HTTPS on our uberspace host:

```
hans-guenther:tmp mop$ sudo ls -al /etc/letsencrypt/live/mop.koeln
total 32
drwxr-xr-x  6 root  wheel  204 25 Okt 09:37 .
drwx------  3 root  wheel  102 25 Okt 09:37 ..
lrwxr-xr-x  1 root  wheel   33 25 Okt 09:37 cert.pem -> ../../archive/mop.koeln/cert1.pem
lrwxr-xr-x  1 root  wheel   34 25 Okt 09:37 chain.pem -> ../../archive/mop.koeln/chain1.pem
lrwxr-xr-x  1 root  wheel   38 25 Okt 09:37 fullchain.pem -> ../../archive/mop.koeln/fullchain1.pem
lrwxr-xr-x  1 root  wheel   36 25 Okt 09:37 privkey.pem -> ../../archive/mop.koeln/privkey1.pem
```

Note that they are only readable for root (for good reason. These files are absolutely sensible. If an attacker gets hold of these files he can decrypt everything).

SCP/SFTP the privkey and the fullchain file to a PRIVATE location (i.e. your home directory and NOT somewhere on your webserver) on your uberspace host.

Run the following commands to prepare everything for the uberspace guys:

```
[mop@host ~]$ wget "https://letsencrypt.org/certs/lets-encrypt-x1-cross-signed.pem"
[mop@host ~]$ uberspace-prepare-certificate -c mop.koeln.cert.pem -k mop.koeln.key.pem -i lets-encrypt-x1-cross-signed.pem 

Let's check the files...
Key is okay...
Certificate is okay...
Certificate matches key...
All good!

Feel free to mail to hallo@uberspace.de, please include the following information:

Host: host.uberspace.de
uberspace-import-ssl-cert -u mop -c /home/mop/.tls-certs/mop.mop.koeln.combined.pem
```

Even though the intermediate certificate is an optional argument it is required for this command to work. I initially omitted the intermediate certificate (because I didn't really know what it is ;) ) and caused some extra work for the uberspace guys. But as always they were very friendly and helped out :)

Mail the above output to the uberspace guys and finally you should have https support just like me: https://mop.koeln/ :D
